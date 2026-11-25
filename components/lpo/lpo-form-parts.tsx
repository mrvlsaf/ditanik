import { InfoTip } from "@/components/ui/InfoTip";
import { DEFAULT_VAT_PERCENT, roundCurrency } from "@/modules/lpo/domain/line-items";
import {
  EMPTY_LINE_ITEM_ROW,
  summariseLineItemRows,
  type LpoLineItemRow,
} from "@/modules/lpo/domain/line-item-rows";
import { previewDueDates } from "@/modules/lpo/domain/due-date-defaults";

/** Shared input look for the LPO forms. */
export const INPUT_CLASS =
  "min-h-11 w-full rounded-[10px] border border-[#8b928b] bg-white px-3 text-sm text-[var(--foreground)]";
export const TEXTAREA_CLASS =
  "min-h-22 w-full rounded-[10px] border border-[#8b928b] bg-white px-3 py-2.5 text-sm text-[var(--foreground)]";
const LINE_INPUT_CLASS =
  "min-h-10 w-full rounded-[10px] border border-[#8b928b] bg-white px-2.5 text-sm text-[var(--foreground)]";

/** A numbered card: "1 The order", "2 The client", "3 Line items". */
export function FormSection({
  step,
  title,
  help,
  children,
}: Readonly<{
  step: number;
  title: string;
  /** One line shown to the right of the title. */
  help?: string;
  children: React.ReactNode;
}>) {
  return (
    <section
      className="surface-card flex flex-col gap-4 p-5"
      aria-labelledby={`lpo-section-${step}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#1a1a1a] text-[13px] font-bold text-white"
          >
            {step}
          </span>
          <h2 id={`lpo-section-${step}`} className="text-[17px] font-bold">
            {title}
          </h2>
        </div>
        {help ? <p className="text-[13px] text-[#4d544d]">{help}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A label with an optional (i) tip, the control, and optional help under it. */
export function FormField({
  label,
  htmlFor,
  tip,
  optional,
  hint,
  className,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  tip?: string;
  optional?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[#2c322c]">
          {label}
          {optional ? (
            <span className="ml-1.5 font-normal text-[#4d544d]">(optional)</span>
          ) : null}
        </label>
        {tip ? <InfoTip label={`About ${label}`}>{tip}</InfoTip> : null}
      </div>
      {children}
      {hint ? <p className="text-[13px] leading-snug text-[#4d544d]">{hint}</p> : null}
    </div>
  );
}

export type ClientDetailsValues = {
  clientName: string;
  siteCode: string;
  clientSubEntityName: string;
  clientTrn: string;
  currency: string;
  invoiceAddress: string;
  deliveryAddress: string;
  paymentTerms: string;
  deliveryTerms: string;
};

/** The client and commercial fields, shared by the create and edit forms. */
export function ClientDetailsFields({
  values,
  onChange,
}: Readonly<{
  values: ClientDetailsValues;
  onChange: (patch: Partial<ClientDetailsValues>) => void;
}>) {
  return (
    <>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <FormField label="Client name" htmlFor="lpo-client-name">
          <input
            id="lpo-client-name"
            name="clientName"
            required
            value={values.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
            className={INPUT_CLASS}
            placeholder="e.g. ABC Hotel"
          />
        </FormField>
        <FormField
          label="Site code"
          htmlFor="lpo-site-code"
          tip="A short code for this customer site, for example AHO. It starts every document number made from this LPO (for example AHO-INV-23072026-09). It is not read from the PDF, because the customer's LPO does not carry it."
        >
          <input
            id="lpo-site-code"
            name="siteCode"
            required
            value={values.siteCode}
            onChange={(e) => onChange({ siteCode: e.target.value })}
            className={INPUT_CLASS}
            placeholder="e.g. AHO"
          />
        </FormField>
        <FormField label="Branch or sub-entity" htmlFor="lpo-sub-entity" optional>
          <input
            id="lpo-sub-entity"
            name="clientSubEntityName"
            value={values.clientSubEntityName}
            onChange={(e) => onChange({ clientSubEntityName: e.target.value })}
            className={INPUT_CLASS}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Client TRN" htmlFor="lpo-client-trn" optional>
          <input
            id="lpo-client-trn"
            name="clientTrn"
            value={values.clientTrn}
            onChange={(e) => onChange({ clientTrn: e.target.value })}
            className={INPUT_CLASS}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Currency" htmlFor="lpo-currency">
          <input
            id="lpo-currency"
            name="currency"
            value={values.currency}
            onChange={(e) => onChange({ currency: e.target.value })}
            className={INPUT_CLASS}
          />
        </FormField>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <FormField label="Invoice address" htmlFor="lpo-invoice-address">
          <textarea
            id="lpo-invoice-address"
            name="invoiceAddress"
            required
            rows={3}
            value={values.invoiceAddress}
            onChange={(e) => onChange({ invoiceAddress: e.target.value })}
            className={TEXTAREA_CLASS}
            placeholder="Client billing address, from the LPO"
          />
        </FormField>
        <FormField label="Delivery address" htmlFor="lpo-delivery-address" optional>
          <textarea
            id="lpo-delivery-address"
            name="deliveryAddress"
            rows={3}
            value={values.deliveryAddress}
            onChange={(e) => onChange({ deliveryAddress: e.target.value })}
            className={TEXTAREA_CLASS}
            placeholder="Leave blank to reuse the invoice address"
          />
        </FormField>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <FormField label="Payment terms" htmlFor="lpo-payment-terms" optional>
          <input
            id="lpo-payment-terms"
            name="paymentTerms"
            value={values.paymentTerms}
            onChange={(e) => onChange({ paymentTerms: e.target.value })}
            className={INPUT_CLASS}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Delivery terms" htmlFor="lpo-delivery-terms" optional>
          <input
            id="lpo-delivery-terms"
            name="deliveryTerms"
            value={values.deliveryTerms}
            onChange={(e) => onChange({ deliveryTerms: e.target.value })}
            className={INPUT_CLASS}
            placeholder="Optional"
          />
        </FormField>
      </div>
    </>
  );
}

/** The line-items table with live totals, shared by the create and edit forms. */
export function LineItemsSection({
  rows,
  onChange,
}: Readonly<{
  rows: LpoLineItemRow[];
  onChange: (rows: LpoLineItemRow[]) => void;
}>) {
  const { rowTotals, subtotal, vatAmount, grandTotal, allRowsValid } =
    summariseLineItemRows(rows);

  function updateRow(index: number, patch: Partial<LpoLineItemRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <FormSection
      step={3}
      title="Line items"
      help="Copy the lines from the customer's LPO."
    >
      <p className="-mt-2 text-[13px] leading-snug text-[#4d544d]">
        Category is an optional label to group lines, for example CHEF or BARISTA. The
        fabric an order needs is added separately, on the LPO page.
      </p>
      <div className="-mx-5 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-y border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs font-bold tracking-wide text-[#4d544d] uppercase">
            <tr>
              <th scope="col" className="px-3 py-2.5 first:pl-5">
                Description
              </th>
              <th scope="col" className="px-3 py-2.5">
                Category
              </th>
              <th scope="col" className="px-3 py-2.5">
                Article no.
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Qty
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Unit price
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Discount %
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Line total
              </th>
              <th scope="col" className="px-3 py-2.5 pr-5">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0ea]">
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="px-3 py-2 first:pl-5">
                  <input
                    required
                    aria-label={`Description, line ${index + 1}`}
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    className={`${LINE_INPUT_CLASS} min-w-48`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    aria-label={`Category, line ${index + 1}`}
                    value={row.category}
                    onChange={(e) => updateRow(index, { category: e.target.value })}
                    className={`${LINE_INPUT_CLASS} min-w-28`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    aria-label={`Article number, line ${index + 1}`}
                    value={row.articleNo}
                    onChange={(e) => updateRow(index, { articleNo: e.target.value })}
                    className={`${LINE_INPUT_CLASS} w-28`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    aria-label={`Quantity, line ${index + 1}`}
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: e.target.value })}
                    className={`${LINE_INPUT_CLASS} w-20 text-right`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    aria-label={`Unit price, line ${index + 1}`}
                    value={row.unitPrice}
                    onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
                    className={`${LINE_INPUT_CLASS} w-28 text-right`}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    aria-label={`Discount percent, line ${index + 1}`}
                    value={row.discountPercent}
                    onChange={(e) =>
                      updateRow(index, { discountPercent: e.target.value })
                    }
                    className={`${LINE_INPUT_CLASS} w-24 text-right`}
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                  {rowTotals[index] != null ? rowTotals[index]!.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-2 pr-5">
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onChange(rows.filter((_, i) => i !== index))}
                      className="btn-danger-outline"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onChange([...rows, { ...EMPTY_LINE_ITEM_ROW }])}
          className="btn-secondary"
        >
          Add a line
        </button>
      </div>

      <div className="flex flex-col items-end gap-1 border-t border-[#eef0ea] pt-3 text-sm">
        <span className="text-[#4d544d]">
          Subtotal:{" "}
          <span className="font-medium text-[var(--foreground)]">
            {subtotal.toFixed(2)}
          </span>
        </span>
        <span className="text-[#4d544d]">
          VAT ({DEFAULT_VAT_PERCENT}%):{" "}
          <span className="font-medium text-[var(--foreground)]">
            {vatAmount.toFixed(2)}
          </span>
        </span>
        <span className="text-[var(--foreground)]">
          Grand total:{" "}
          <span className="font-bold">{roundCurrency(grandTotal).toFixed(2)}</span>
        </span>
        {!allRowsValid ? (
          <span className="text-xs text-amber-700">
            Complete every line (description, qty, unit price) to see accurate totals.
            Invalid rows are left out above.
          </span>
        ) : null}
      </div>
    </FormSection>
  );
}

/** "Dates we will set": the three due dates worked out from the received date. */
export function DatesPanel({ receivedDate }: Readonly<{ receivedDate: string }>) {
  const dates = previewDueDates(receivedDate);
  const rows: Array<[string, string]> = [
    ["Assign a manufacturer by", dates?.assignment ?? "Pick a received date"],
    ["Production deadline", dates?.productionDeadline ?? "Pick a received date"],
    ["Client delivery", dates?.clientDelivery ?? "Pick a received date"],
  ];

  return (
    <section
      className="surface-card flex flex-col gap-3 p-5"
      aria-labelledby="lpo-dates-heading"
    >
      <div className="flex items-center gap-2">
        <h2 id="lpo-dates-heading" className="text-[17px] font-bold">
          Dates we will set
        </h2>
        <InfoTip label="How are dates set?">
          Calculated from the date received, using the Asia / Dubai business day. You can
          extend any of them later on the LPO page.
        </InfoTip>
      </div>
      <dl className="flex flex-col gap-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-[#4d544d]">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
