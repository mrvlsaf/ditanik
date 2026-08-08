/** Remaining meters = received − delivered. */
export function calculateMetersRemaining(
  metersReceived: number,
  metersDelivered: number,
): number {
  if (!Number.isFinite(metersReceived) || !Number.isFinite(metersDelivered)) {
    throw new Error("Meters must be valid numbers.");
  }
  if (metersReceived < 0 || metersDelivered < 0) {
    throw new Error("Meters cannot be negative.");
  }
  if (metersDelivered > metersReceived) {
    throw new Error("Meters delivered cannot exceed meters received.");
  }
  return Number((metersReceived - metersDelivered).toFixed(2));
}

export function normalizeVendorName(vendor: string): string {
  return vendor.trim().replace(/\s+/g, " ").toLowerCase();
}
