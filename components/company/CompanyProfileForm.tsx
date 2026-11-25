"use client";

import { useActionState } from "react";

import Link from "next/link";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import {
  Field,
  FormHeader,
  FormMessage,
  INPUT_CLASS,
  TEXTAREA_CLASS,
} from "@/components/ui/Field";

import {
  saveCompanyProfileAction,
  type CompanyProfileActionState,
} from "@/modules/company/application/company-profile-action";

const initialState: CompanyProfileActionState = { ok: false, message: null };

export type CompanyProfileFormValues = {
  legalName: string;
  trn: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  email: string;
  website: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankSwiftCode: string;
  defaultTermsText: string;
  defaultFooterText: string;
};

function TextField({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  tip,
}: Readonly<{
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
  tip?: string;
}>) {
  return (
    <Field label={label} tip={tip}>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className={INPUT_CLASS}
      />
    </Field>
  );
}

/**
 * Single settings form for Deezano's own letterhead + bank details — the
 * constant "from" side of every generated Quotation, Invoice and
 * Delivery Note. Saves onto the one CompanyProfile row (upsert).
 */
export function CompanyProfileForm({
  defaults,
}: Readonly<{ defaults: CompanyProfileFormValues }>) {
  const [state, formAction, isPending] = useActionState(
    saveCompanyProfileAction,
    initialState,
  );
  useGlobalPending(isPending);

  const grid =
    "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]";
  const card = "surface-card flex flex-col gap-4 p-5";

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
        <section className={card} aria-labelledby="company-details">
          <h2 id="company-details" className="text-[17px] font-bold">
            Company details
          </h2>
          <div className={grid}>
            <TextField
              name="legalName"
              label="Legal name"
              defaultValue={defaults.legalName}
              required
            />
            <TextField
              name="trn"
              label="TRN"
              defaultValue={defaults.trn}
              tip="Your tax registration number. It appears on tax invoices."
            />
            <TextField
              name="addressLine1"
              label="Address line 1"
              defaultValue={defaults.addressLine1}
            />
            <TextField
              name="addressLine2"
              label="Address line 2"
              defaultValue={defaults.addressLine2}
            />
            <TextField name="phone" label="Phone" defaultValue={defaults.phone} />
            <TextField
              name="email"
              label="Email"
              type="email"
              defaultValue={defaults.email}
            />
            <TextField name="website" label="Website" defaultValue={defaults.website} />
          </div>
        </section>

        <section className={card} aria-labelledby="bank-details">
          <h2 id="bank-details" className="text-[17px] font-bold">
            Bank details
          </h2>
          <div className={grid}>
            <TextField
              name="bankName"
              label="Bank name"
              defaultValue={defaults.bankName}
            />
            <TextField
              name="bankAccountName"
              label="Account name"
              defaultValue={defaults.bankAccountName}
            />
            <TextField
              name="bankAccountNumber"
              label="Account number"
              defaultValue={defaults.bankAccountNumber}
            />
            <TextField name="bankIban" label="IBAN" defaultValue={defaults.bankIban} />
            <TextField
              name="bankSwiftCode"
              label="SWIFT / BIC"
              defaultValue={defaults.bankSwiftCode}
            />
          </div>
        </section>

        <section className={card} aria-labelledby="default-wording">
          <FormHeader
            title="Default wording"
            help="The terms are used on quotations. The footer is printed on every document you create."
          />
          <Field
            label="Terms and conditions (used on quotations)"
            hint="One clause per line. Leave blank to use the standard 16 clauses. Wrap text in **double asterisks** to make it bold."
            tip="One clause per line. Each line becomes one numbered clause on the quotation. Wrap text in double asterisks to make it bold. Leave this blank to use the standard 16 clauses."
          >
            <textarea
              name="defaultTermsText"
              defaultValue={defaults.defaultTermsText}
              rows={12}
              className={TEXTAREA_CLASS}
            />
          </Field>
          <Field label="Footer text">
            <textarea
              name="defaultFooterText"
              defaultValue={defaults.defaultFooterText}
              rows={2}
              className={TEXTAREA_CLASS}
            />
          </Field>
        </section>

        <div className="flex flex-wrap items-center gap-3.5">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Saving…" : "Save company profile"}
          </button>
          {state.ok ? (
            <p
              role="status"
              className="rounded-[10px] bg-[var(--brand-muted)] px-3.5 py-2 text-sm font-semibold text-[#2a4d33]"
            >
              {state.message || "Saved. New documents will use these details."}
            </p>
          ) : (
            <FormMessage ok={false} message={state.message} />
          )}
        </div>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
        <section className="surface-card flex flex-col gap-2.5 p-5">
          <h2 className="text-[17px] font-bold">Where this appears</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Your name, address, TRN and bank details are printed at the top and bottom of
            every document created from now on.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Documents you already created keep the details they were made with.
          </p>
          <Link
            href="/documents/new"
            className="inline-flex min-h-8 items-center text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            Create a document →
          </Link>
        </section>
      </aside>
    </form>
  );
}
