"use client";

import { useActionState } from "react";

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
}: Readonly<{
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  type?: string;
}>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
      />
    </label>
  );
}

/**
 * Single settings form for Deezano's own letterhead + bank details — the
 * constant "from" side of every generated Quotation, Quote, Invoice and
 * Delivery Note. Saves onto the one CompanyProfile row (upsert).
 */
export function CompanyProfileForm({
  defaults,
}: Readonly<{ defaults: CompanyProfileFormValues }>) {
  const [state, formAction, isPending] = useActionState(
    saveCompanyProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6 surface-card p-4 sm:p-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">Company details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="legalName" label="Legal name" defaultValue={defaults.legalName} required />
          <TextField name="trn" label="TRN" defaultValue={defaults.trn} />
          <TextField name="addressLine1" label="Address line 1" defaultValue={defaults.addressLine1} />
          <TextField name="addressLine2" label="Address line 2" defaultValue={defaults.addressLine2} />
          <TextField name="phone" label="Phone" defaultValue={defaults.phone} />
          <TextField name="email" label="Email" type="email" defaultValue={defaults.email} />
          <TextField name="website" label="Website" defaultValue={defaults.website} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">Bank details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="bankName" label="Bank name" defaultValue={defaults.bankName} />
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
          <TextField name="bankSwiftCode" label="SWIFT / BIC" defaultValue={defaults.bankSwiftCode} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">
          Default document text
        </h3>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Default terms &amp; conditions (used on Quote documents)
          </span>
          <span className="mb-1 block text-xs text-zinc-500">
            One point per line — each line becomes one numbered point on the
            Quote. Leave blank to keep the built-in default text.
          </span>
          <textarea
            name="defaultTermsText"
            defaultValue={defaults.defaultTermsText}
            rows={12}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Default footer text
          </span>
          <textarea
            name="defaultFooterText"
            defaultValue={defaults.defaultFooterText}
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {state.message ? (
        <p
          className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary min-h-11">
        {isPending ? "Saving…" : "Save company profile"}
      </button>
    </form>
  );
}
