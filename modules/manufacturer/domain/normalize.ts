/** Normalize manufacturer names for uniqueness. */
export function normalizeManufacturerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
