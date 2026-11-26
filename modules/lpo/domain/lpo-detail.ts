/**
 * Pure helpers for the LPO details page: which tab opens, what the "Next step"
 * banner says, how far along the order is, and whether a date was extended.
 * Plain strings are used for the status and date field (not the Prisma enums)
 * so client components and tests can import this file freely.
 */

export type LpoDetailStatus =
  | "LPO_RECEIVED"
  | "UNDER_REVIEW"
  | "ASSIGNED_TO_MANUFACTURER"
  | "CLIENT_DELIVERY_COMPLETED";

const LPO_DETAIL_TAB_IDS = [
  "summary",
  "lines",
  "dates",
  "fabric",
  "production",
  "documents",
] as const;

export type LpoDetailTabId = (typeof LPO_DETAIL_TAB_IDS)[number];

export type LpoDeepLinkAction = "assign" | "dates" | "complete";

/** The tab named by ?tab=, or null when it is missing or unknown. */
export function parseDetailTab(value: string | null | undefined): LpoDetailTabId | null {
  return LPO_DETAIL_TAB_IDS.find((id) => id === value) ?? null;
}

/** Notification links (?action=) open the tab that holds the thing to do. */
export function tabForAction(action: LpoDeepLinkAction | null): LpoDetailTabId | null {
  switch (action) {
    case "assign":
    case "complete":
      return "production";
    case "dates":
      return "dates";
    default:
      return null;
  }
}

/** An explicit ?tab= wins, then the notification action, then Summary. */
export function initialDetailTab(
  tab: string | null | undefined,
  action: LpoDeepLinkAction | null,
): LpoDetailTabId {
  return parseDetailTab(tab) ?? tabForAction(action) ?? "summary";
}

export type ProgressState = "done" | "current" | "todo";

export type ProgressStep = { label: string; state: ProgressState };

const PROGRESS_LABELS = ["LPO created", "Under review", "Assigned", "Delivered"] as const;

/** Index (0-3) of the step the order is on; 4 means everything is done. */
function currentStepIndex(status: LpoDetailStatus): number {
  switch (status) {
    case "LPO_RECEIVED":
    case "UNDER_REVIEW":
      return 1;
    case "ASSIGNED_TO_MANUFACTURER":
      return 2;
    case "CLIENT_DELIVERY_COMPLETED":
      return 4;
  }
}

export function progressSteps(status: LpoDetailStatus): ProgressStep[] {
  const current = currentStepIndex(status);
  return PROGRESS_LABELS.map((label, index) => ({
    label,
    state: index < current ? "done" : index === current ? "current" : "todo",
  }));
}

export type NextStep = {
  title: string;
  body: string;
};

export function nextStepFor(status: LpoDetailStatus, urgent = false): NextStep {
  if (urgent) {
    return urgentNextStepFor(status);
  }
  switch (status) {
    case "LPO_RECEIVED":
    case "UNDER_REVIEW":
      return {
        title: "Assign a manufacturer",
        body: "Upload the production PDF and choose a manufacturer. You can add the fabric this order needs first, on the Fabric needed tab.",
      };
    case "ASSIGNED_TO_MANUFACTURER":
      return {
        title: "Issue fabric, then mark client delivery completed",
        body: "Send fabric to the manufacturer on the Fabric page. When the goods reach your client, mark delivery completed.",
      };
    case "CLIENT_DELIVERY_COMPLETED":
      return {
        title: "This order is done. Create the tax invoice",
        body: "The client has received the goods. Create the tax invoice in the Documents tab, or on the New document page.",
      };
  }
}

/** Urgent LPOs have no deadlines, reminders or required production file. */
function urgentNextStepFor(status: LpoDetailStatus): NextStep {
  switch (status) {
    case "LPO_RECEIVED":
    case "UNDER_REVIEW":
      return {
        title: "Assign a manufacturer",
        body: "Choose a manufacturer. An urgent LPO has no deadlines, so there is no production date to set and no reminders are sent.",
      };
    case "ASSIGNED_TO_MANUFACTURER":
      return {
        title: "Mark client delivery completed",
        body: "When the goods reach your client, mark delivery completed. No production file is needed for an urgent LPO.",
      };
    case "CLIENT_DELIVERY_COMPLETED":
      return {
        title: "This urgent order is done. Create the tax invoice",
        body: "The client has received the goods. Create the tax invoice in the Documents tab, or on the New document page.",
      };
  }
}

export type PrimaryAction = { label: string; tab: LpoDetailTabId };

/** The one button the header leads with for this status. */
export function primaryActionFor(status: LpoDetailStatus): PrimaryAction {
  switch (status) {
    case "LPO_RECEIVED":
    case "UNDER_REVIEW":
      return { label: "Assign manufacturer", tab: "production" };
    case "ASSIGNED_TO_MANUFACTURER":
      return { label: "Mark delivery completed", tab: "production" };
    case "CLIENT_DELIVERY_COMPLETED":
      return { label: "Create tax invoice", tab: "documents" };
  }
}

/** "Original date", "Extended once" or "Extended 3 times" for one date field. */
export function extensionLabel(
  changes: ReadonlyArray<{ field: string }>,
  field: string,
): string {
  const count = changes.filter((change) => change.field === field).length;
  if (count === 0) {
    return "Original date";
  }
  return count === 1 ? "Extended once" : `Extended ${count} times`;
}

export function isExtended(
  changes: ReadonlyArray<{ field: string }>,
  field: string,
): boolean {
  return changes.some((change) => change.field === field);
}
