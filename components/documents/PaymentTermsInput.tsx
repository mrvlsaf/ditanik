"use client";

import { INPUT_CLASS } from "@/components/ui/Field";
import { normalizePaymentTerms } from "@/modules/documents/domain/quotation-terms";
import { useState } from "react";

/** The payment terms box for a quotation, with a live preview of the printed clause. */
export function PaymentTermsInput({
  className = INPUT_CLASS,
  wrapperClassName = "w-full",
  initialValue = "",
}: Readonly<{
  initialValue?: string;
  className?: string;
  /** Sizing of the whole box, for example a flex basis when it sits in a row. */
  wrapperClassName?: string;
}>) {
  const [value, setValue] = useState(initialValue);
  const typed = normalizePaymentTerms(value);

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${wrapperClassName}`}>
      <input
        name="paymentTerms"
        aria-label="Payment terms"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={200}
        className={className}
        placeholder="30 days credit ( full payment 30 days after invoice submission )"
      />
      <div
        className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
        aria-live="polite"
      >
        <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
          How it will look on the quotation
        </p>
        {typed ? (
          <p className="mt-1 leading-relaxed text-[var(--foreground)]">
            <strong>Payment Terms:</strong> Payment terms are <strong>{typed}</strong>
          </p>
        ) : (
          <p className="mt-1 leading-relaxed text-[var(--text-muted)]">
            Nothing typed, so the Payment Terms wording from your company terms and
            conditions is used, with its value in bold.
          </p>
        )}
      </div>
    </div>
  );
}
