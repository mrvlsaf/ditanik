import { InfoTip } from "@/components/ui/InfoTip";

/** The shared look for text boxes, selects and dates across the forms. */
export const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-[#8b928b] bg-white px-3 text-sm text-[var(--foreground)]";

/** A smaller version for boxes inside a table row. */
export const CELL_INPUT_CLASS =
  "min-h-10 w-full rounded-[10px] border border-[#8b928b] bg-white px-2.5 text-sm text-[var(--foreground)]";

export const TEXTAREA_CLASS =
  "min-h-22 w-full rounded-[10px] border border-[#8b928b] bg-white px-3 py-2.5 text-sm text-[var(--foreground)]";

/**
 * A label above a form control, with an optional "(optional)" mark, a short
 * hint underneath and an (i) tip. Wraps the control in a <label>, so no ids
 * are needed.
 */
export function Field({
  label,
  optional,
  hint,
  tip,
  className,
  children,
}: Readonly<{
  label: string;
  optional?: boolean;
  /** One line shown under the control. */
  hint?: string;
  /** Longer explanation, shown in an (i) tip beside the label. */
  tip?: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {label}
          {optional ? (
            <span className="ml-1.5 font-normal text-[var(--text-muted)]">
              (optional)
            </span>
          ) : null}
          {tip ? (
            <span className="ml-1.5">
              <InfoTip label={`About ${label}`}>{tip}</InfoTip>
            </span>
          ) : null}
        </span>
        {children}
      </label>
      {hint ? <span className="text-xs text-[var(--text-muted)]">{hint}</span> : null}
    </div>
  );
}

/** The result line under a form: green when it worked, red when it did not. */
export function FormMessage({
  ok,
  message,
}: Readonly<{ ok: boolean; message: string | null | undefined }>) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="status"
      className={`text-sm font-medium ${ok ? "text-[var(--brand)]" : "text-[var(--danger)]"}`}
    >
      {message}
    </p>
  );
}

/** The title and one-line explanation at the top of a form card. */
export function FormHeader({
  title,
  help,
}: Readonly<{ title: string; help?: React.ReactNode }>) {
  return (
    <div>
      <h2 className="text-[17px] font-bold text-[var(--foreground)]">{title}</h2>
      {help ? (
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{help}</p>
      ) : null}
    </div>
  );
}

/** Class for the card that holds a form. */
export const FORM_CARD_CLASS =
  "surface-card flex max-w-[860px] flex-col gap-5 p-5 sm:p-6";
