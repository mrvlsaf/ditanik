/**
 * The three numbers at the top of a manufacturer's page, worked out from the
 * ledger sections already loaded (one per LPO, plus the no-LPO bucket).
 */

export type LedgerTotals = {
  totalSent: number;
  totalExpectedBalance: number;
};

export type LedgerGlance = {
  /** All fabric issued to this manufacturer, with or without an LPO. */
  fabricSentMeters: number;
  /** What should still be at the manufacturer, going by expected use. */
  expectedOnHandMeters: number;
  /** How many LPO sections have fabric sent against them. */
  lposWithFabric: number;
};

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function summariseLedgerGlance(
  lpoSections: ReadonlyArray<LedgerTotals>,
  standalone: LedgerTotals,
): LedgerGlance {
  const all = [...lpoSections, standalone];
  return {
    fabricSentMeters: round3(all.reduce((sum, row) => sum + row.totalSent, 0)),
    expectedOnHandMeters: round3(
      all.reduce((sum, row) => sum + row.totalExpectedBalance, 0),
    ),
    lposWithFabric: lpoSections.filter((row) => row.totalSent > 0).length,
  };
}

/** "Across 2 LPOs and additional fabric" / "Across 1 LPO" / "Nothing sent yet". */
export function fabricSentSubtitle(glance: LedgerGlance, hasStandalone: boolean): string {
  const lpos = `${glance.lposWithFabric} ${glance.lposWithFabric === 1 ? "LPO" : "LPOs"}`;
  if (glance.lposWithFabric === 0 && !hasStandalone) {
    return "Nothing sent yet";
  }
  if (glance.lposWithFabric === 0) {
    return "Additional fabric only";
  }
  return hasStandalone ? `Across ${lpos} and additional fabric` : `Across ${lpos}`;
}

const REASON_LABELS: Record<string, string> = {
  CUTTING_WASTAGE: "Cutting wastage",
  DAMAGE: "Damage",
  SIZE_ALTERATION: "Size alteration",
  PRODUCTION_MISTAKE: "Production mistake",
  OTHER: "Other",
};

/** "Cutting wastage" for CUTTING_WASTAGE; unknown values are made readable. */
export function varianceReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replaceAll("_", " ").toLowerCase();
}
