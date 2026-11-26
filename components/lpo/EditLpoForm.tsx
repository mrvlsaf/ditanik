"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { INPUT_CLASS } from "@/components/ui/Field";
import {
  ClientDetailsFields,
  FormField,
  FormSection,
  LineItemsSection,
  type ClientDetailsValues,
} from "@/components/lpo/lpo-form-parts";
import {
  updateLpoAction,
  type UpdateLpoActionState,
} from "@/modules/lpo/application/update-lpo-action";
import {
  EMPTY_LINE_ITEM_ROW,
  lineItemRowsToJson,
  type LpoLineItemRow,
} from "@/modules/lpo/domain/line-item-rows";

const initialState: UpdateLpoActionState = { ok: false, message: null };

export type EditLpoFormDefaults = {
  lpoId: string;
  lpoNumber: string;
  nickname: string;
  clientName: string;
  clientSubEntityName: string;
  clientTrn: string;
  invoiceAddress: string;
  deliveryAddress: string;
  siteCode: string;
  paymentTerms: string;
  deliveryTerms: string;
  currency: string;
  lineItems: LpoLineItemRow[];
};

/**
 * Edits an LPO's client/commercial details and line items after creation. The
 * LPO number, received date and original PDF stay fixed; generated documents
 * keep their own frozen snapshot.
 */
export function EditLpoForm({ defaults }: Readonly<{ defaults: EditLpoFormDefaults }>) {
  const router = useRouter();
  const [nickname, setNickname] = useState(defaults.nickname);
  const [client, setClient] = useState<ClientDetailsValues>({
    clientName: defaults.clientName,
    siteCode: defaults.siteCode,
    clientSubEntityName: defaults.clientSubEntityName,
    clientTrn: defaults.clientTrn,
    currency: defaults.currency,
    invoiceAddress: defaults.invoiceAddress,
    deliveryAddress: defaults.deliveryAddress,
    paymentTerms: defaults.paymentTerms,
    deliveryTerms: defaults.deliveryTerms,
  });
  const [lineItems, setLineItems] = useState<LpoLineItemRow[]>(
    defaults.lineItems.length > 0 ? defaults.lineItems : [{ ...EMPTY_LINE_ITEM_ROW }],
  );
  const [state, formAction, isPending] = useActionState(
    async (
      previous: UpdateLpoActionState,
      formData: FormData,
    ): Promise<UpdateLpoActionState> => {
      const result = await updateLpoAction(previous, formData);
      if (result.ok) {
        router.push(`/lpo/${defaults.lpoId}`);
      }
      return result;
    },
    initialState,
  );
  useGlobalPending(isPending);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-6">
      <input type="hidden" name="lpoId" value={defaults.lpoId} />
      <input type="hidden" name="lineItemsJson" value={lineItemRowsToJson(lineItems)} />

      <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
        <FormSection step={1} title="The order">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            <FormField label="LPO number" htmlFor="lpo-number" hint="Fixed once saved.">
              <input
                id="lpo-number"
                value={defaults.lpoNumber}
                readOnly
                className={`${INPUT_CLASS} bg-[var(--surface-muted)] font-bold`}
              />
            </FormField>
            <FormField
              label="Nickname"
              htmlFor="lpo-nickname"
              tip="A short name you will recognise in lists, for example the client and what was ordered."
            >
              <input
                id="lpo-nickname"
                name="nickname"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className={INPUT_CLASS}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          step={2}
          title="The client"
          help="Used for quotations, invoices and delivery notes made from now on."
        >
          <ClientDetailsFields
            values={client}
            onChange={(patch) => setClient((prev) => ({ ...prev, ...patch }))}
          />
        </FormSection>

        <LineItemsSection rows={lineItems} onChange={setLineItems} />
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-6">
        <section
          className="surface-card flex flex-col gap-3 p-5"
          aria-labelledby="lpo-fixed-heading"
        >
          <h2 id="lpo-fixed-heading" className="text-[17px] font-bold">
            What stays fixed
          </h2>
          <p className="text-[13px] leading-snug text-[#4d544d]">
            The LPO number, the date received and the original PDF are the record of what
            came in, so they can&apos;t be edited here. The received date sets the due
            dates. To move those, use the dates section on the LPO page, with a reason.
          </p>
          <p className="text-[13px] leading-snug text-[#4d544d]">
            Documents already made keep the details that were true when they were made.
            Saving here does not change them.
          </p>
        </section>

        <section
          className="surface-card flex flex-col gap-3.5 p-5"
          aria-labelledby="lpo-save-heading"
        >
          <h2 id="lpo-save-heading" className="text-[17px] font-bold">
            Save your changes
          </h2>
          {state.message ? (
            <p
              className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
              role="status"
            >
              {state.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary min-h-11 w-full"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/lpo/${defaults.lpoId}`)}
            className="btn-secondary min-h-11 w-full"
          >
            Cancel
          </button>
        </section>
      </aside>
    </form>
  );
}
