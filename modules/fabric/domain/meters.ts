/** Remaining stock from signed movement quantities (receipts +, issues −). */
export function calculateStockFromMovements(
  movements: ReadonlyArray<{ quantityMeters: number }>,
): number {
  return movements.reduce((sum, row) => sum + row.quantityMeters, 0);
}

export function calculateExpectedMeters(
  quantity: number,
  metersPerUnit: number,
): number {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be an integer of at least 1.");
  }
  if (!(metersPerUnit > 0)) {
    throw new Error("Meters per unit must be greater than 0.");
  }
  return roundMeters(quantity * metersPerUnit);
}

export function calculateVarianceDifference(
  expectedMeters: number,
  actualMeters: number,
): number {
  return roundMeters(actualMeters - expectedMeters);
}

/** Additional fabric to send = max(0, required − availableWithManufacturer). */
export function calculateAdditionalFabricRequired(
  requiredMeters: number,
  availableWithManufacturer: number,
): number {
  return roundMeters(Math.max(0, requiredMeters - availableWithManufacturer));
}

export function roundMeters(value: number): number {
  return Math.round(value * 1000) / 1000;
}
