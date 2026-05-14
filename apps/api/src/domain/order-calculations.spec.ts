import { describe, expect, it } from 'vitest';
import { allocateDiscountToLines, calculateTotals } from './order-calculations';

describe('order calculations', () => {
  it('applies discount only to goods and keeps delivery outside discount', () => {
    expect(calculateTotals(10_000, 10, 500)).toEqual({
      productsTotalKopecks: 10_000,
      discountAmountKopecks: 1_000,
      productsTotalAfterDiscountKopecks: 9_000,
      totalToPayKopecks: 9_500,
    });
  });

  it('allocates order discount across product lines without losing kopecks', () => {
    const lines = allocateDiscountToLines(
      [
        { quantity: 1, salePriceKopecks: 333 },
        { quantity: 1, salePriceKopecks: 333 },
        { quantity: 1, salePriceKopecks: 334 },
      ],
      10,
    );

    expect(lines.reduce((sum, value) => sum + value, 0)).toBe(900);
  });
});
