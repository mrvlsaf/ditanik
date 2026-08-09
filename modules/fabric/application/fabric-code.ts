const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** System fabric id, e.g. FAB-A3K9QX (unique-ish; callers should retry on DB conflict). */
export function generateFabricCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `FAB-${suffix}`;
}
