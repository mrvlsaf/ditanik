export const CHIP_TONES = ["gray", "amber", "blue", "green", "purple", "red"] as const;

export type ChipTone = (typeof CHIP_TONES)[number];

/** Class for each tone. Always shown with a text label, never colour alone. */
export const CHIP_TONE_CLASS: Record<ChipTone, string> = {
  gray: "chip chip-gray",
  amber: "chip chip-amber",
  blue: "chip chip-blue",
  green: "chip chip-green",
  purple: "chip chip-purple",
  red: "chip chip-red",
};

/** A small rounded label for a status or a kind, such as "Under review". */
export function Chip({
  tone = "gray",
  children,
}: Readonly<{
  tone?: ChipTone;
  children: React.ReactNode;
}>) {
  return <span className={CHIP_TONE_CLASS[tone]}>{children}</span>;
}
