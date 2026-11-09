// A quantity is a whole number. The upper bound is far above any real limit; it exists so that a
// huge or fractional value is refused with a calm message before it can reach the database, where
// the per-product and per-order limits (checked separately) give the real answer.
export const MAX_LINE_QUANTITY = 100000;

export function isWholeQuantity(value: unknown, options: {allowZero?: boolean} = {}): value is number {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  return value >= (options.allowZero ? 0 : 1) && value <= MAX_LINE_QUANTITY;
}

export const INVALID_QUANTITY_MESSAGE = "Please choose a whole number of pieces.";
