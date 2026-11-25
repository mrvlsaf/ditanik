"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { INPUT_CLASS } from "@/components/ui/Field";
import {
  ClientDetailsFields,
  DatesPanel,
  FormField,
  FormSection,
  LineItemsSection,
  type ClientDetailsValues,
} from "@/components/lpo/lpo-form-parts";
import { InfoTip } from "@/components/ui/InfoTip";
import { useDirectUploadOnSubmit } from "@/components/ui/useDirectUploadOnSubmit";

import {
  createLpoAction,
  type CreateLpoActionState,
} from "@/modules/lpo/application/create-lpo-action";
import { assertPdfFile } from "@/modules/files/domain/pdf-rules";
import {
  countFilledFields,
  extractLpoData,
  type ExtractedLpoData,
} from "@/modules/lpo/domain/lpo-extraction";
import { extractPdfLinesInBrowser } from "@/modules/lpo/infrastructure/pdf-text-extraction-browser";
import {
  EMPTY_LINE_ITEM_ROW,
  lineItemRowsToJson,
  type LpoLineItemRow,
} from "@/modules/lpo/domain/line-item-rows";
import { todayInputValue } from "@/lib/dates/today-input";

const initialState: CreateLpoActionState = {
  ok: false,
  message: null,
};

type ExtractState = {
  ok: boolean;
  message: string | null;
  data: ExtractedLpoData | null;
};

const initialExtractState: ExtractState = {
  ok: false,
  message: null,
  data: null,
};

type FieldValues = ClientDetailsValues & {
  lpoNumber: string;
  nickname: string;
  receivedDate: string;
};

export function CreateLpoForm({
  usesBlobStorage,
  nextUrgentNumber,
}: Readonly<{
  usesBlobStorage: boolean;
  /** The number the next urgent LPO will get, shown read-only while Urgent is on. */
  nextUrgentNumber: string;
}>) {
  const today = todayInputValue();
  const emptyFields: FieldValues = {
    lpoNumber: "",
    nickname: "",
    clientName: "",
    receivedDate: today,
    clientSubEntityName: "",
    clientTrn: "",
    invoiceAddress: "",
    deliveryAddress: "",
    siteCode: "",
    paymentTerms: "",
    deliveryTerms: "",
    currency: "AED",
  };

  const [fields, setFields] = useState<FieldValues>(emptyFields);
  const [isUrgent, setIsUrgent] = useState(false);
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LpoLineItemRow[]>([
    { ...EMPTY_LINE_ITEM_ROW },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (
      previous: CreateLpoActionState,
      formData: FormData,
    ): Promise<CreateLpoActionState> => {
      const result = await createLpoAction(previous, formData);
      if (result.ok && result.lpoId) {
        // Open the new LPO, where the next step (assign a manufacturer) lives.
        router.push(`/lpo/${result.lpoId}`);
      }
      return result;
    },
    initialState,
  );

  const [extractState, setExtractState] = useState(initialExtractState);
  const [isExtracting, setIsExtracting] = useState(false);
  const {
    onSubmit: onDirectUploadSubmit,
    isUploadingFile,
    uploadError,
  } = useDirectUploadOnSubmit({
    formAction,
    formRef,
    fileFieldName: "file",
    fileRefFieldName: "fileRef",
    folder: "lpo-originals",
    usesBlobStorage,
  });
  useGlobalPending(isPending || isExtracting || isUploadingFile);

  function updateField(patch: Partial<FieldValues>) {
    setFields((prev) => ({ ...prev, ...patch }));
  }

  // Runs in the browser: nothing is stored, so no Server Action round trip is needed.
  async function handlePrefillFromPdf() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setExtractState({
        ok: false,
        message: "Choose the LPO PDF below first.",
        data: null,
      });
      return;
    }

    setIsExtracting(true);
    let result: ExtractState;
    try {
      assertPdfFile(file);
      const lines = await extractPdfLinesInBrowser(file);
      const data = extractLpoData(lines);
      const filledCount = countFilledFields(data);

      if (filledCount === 0) {
        result = {
          ok: false,
          message:
            "Couldn't find fields this parser recognizes in that PDF — no problem, just fill in the form by hand.",
          data: null,
        };
      } else {
        result = {
          ok: true,
          message: `Prefilled ${filledCount} field${filledCount === 1 ? "" : "s"} from the PDF — check every one before saving, especially the line items.`,
          data,
        };
      }
    } catch (error) {
      const message =
        error instanceof Error &&
        /pdf files are allowed|pdf must be|pdf file is empty/i.test(error.message)
          ? error.message
          : "Couldn't read that PDF — fill in the form manually.";
      Sentry.captureException(error, { tags: { feature: "lpo_pdf_prefill" } });
      result = { ok: false, message, data: null };
    }
    setIsExtracting(false);
    setExtractState(result);

    if (result.ok && result.data) {
      const extracted = result.data;
      setFields((prev) => ({
        ...prev,
        // An urgent LPO keeps its generated number, so only a normal one takes the PDF's.
        lpoNumber: isUrgent ? prev.lpoNumber : (extracted.orderNumber ?? prev.lpoNumber),
        clientName: extracted.clientName ?? prev.clientName,
        clientSubEntityName: extracted.clientSubEntityName ?? prev.clientSubEntityName,
        clientTrn: extracted.clientTrn ?? prev.clientTrn,
        invoiceAddress: extracted.invoiceAddress ?? prev.invoiceAddress,
        deliveryAddress: extracted.deliveryAddress ?? prev.deliveryAddress,
        currency: extracted.currency ?? prev.currency,
        paymentTerms: extracted.paymentTerms ?? prev.paymentTerms,
        deliveryTerms: extracted.deliveryTerms ?? prev.deliveryTerms,
        receivedDate:
          extracted.orderDate && extracted.orderDate <= today
            ? extracted.orderDate
            : prev.receivedDate,
      }));

      if (extracted.lineItems.length > 0) {
        setLineItems(
          extracted.lineItems.map((item) => ({
            category: "",
            description: item.description,
            articleNo: item.articleNo ?? "",
            quantity: item.quantity != null ? String(item.quantity) : "",
            unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
            discountPercent:
              item.discountPercent != null && item.discountPercent > 0
                ? String(item.discountPercent)
                : "",
          })),
        );
      }
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onDirectUploadSubmit}
      className="flex flex-wrap items-start gap-6"
    >
      <input type="hidden" name="lineItemsJson" value={lineItemRowsToJson(lineItems)} />

      <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
        <FormSection step={1} title="The order">
          <div
            className={`flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3.5 ${
              isUrgent
                ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                : "border-[var(--border)] bg-[var(--surface-muted)]"
            }`}
          >
            <button
              type="button"
              role="switch"
              aria-checked={isUrgent}
              aria-labelledby="lpo-urgent-label"
              onClick={() => setIsUrgent((value) => !value)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
                isUrgent ? "bg-[var(--brand)]" : "bg-[#b9beb7]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  isUrgent ? "translate-x-5" : ""
                }`}
              />
            </button>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
              <span id="lpo-urgent-label" className="text-[15px] font-bold">
                Urgent LPO
              </span>
              <span className="text-[13px] leading-snug text-[#4d544d]">
                For rush orders delivered in 1 to 2 days. The PDF becomes optional, the
                number is made for you, and there are no deadlines or reminders.
              </span>
            </div>
            {isUrgent ? <input type="hidden" name="isUrgent" value="on" /> : null}
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            {isUrgent ? (
              <FormField
                label="LPO number"
                htmlFor="lpo-number-urgent"
                tip="Made automatically: URGENT_ and the next number after your existing urgent LPOs. The final number is set when you save."
                hint="Made for you from your existing urgent LPOs."
              >
                <input
                  id="lpo-number-urgent"
                  readOnly
                  value={nextUrgentNumber}
                  className={`${INPUT_CLASS} bg-[#f3f4f2] font-bold`}
                />
              </FormField>
            ) : (
              <FormField label="LPO number" htmlFor="lpo-number">
                <input
                  id="lpo-number"
                  name="lpoNumber"
                  required
                  value={fields.lpoNumber}
                  onChange={(e) => updateField({ lpoNumber: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g. 45892"
                />
              </FormField>
            )}
            <FormField
              label="Nickname"
              htmlFor="lpo-nickname"
              tip="A short name you will recognise in lists, for example the client and what was ordered."
            >
              <input
                id="lpo-nickname"
                name="nickname"
                required
                value={fields.nickname}
                onChange={(e) => updateField({ nickname: e.target.value })}
                className={INPUT_CLASS}
                placeholder="e.g. ABC Hotel Uniform"
              />
            </FormField>
            <FormField label="Date received" htmlFor="lpo-received-date">
              <input
                id="lpo-received-date"
                type="date"
                name="receivedDate"
                required
                value={fields.receivedDate}
                onChange={(e) => updateField({ receivedDate: e.target.value })}
                max={today}
                className={INPUT_CLASS}
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="lpo-file"
                className="text-[13px] font-semibold text-[#2c322c]"
              >
                Original LPO (PDF)
                {isUrgent ? (
                  <span className="ml-1.5 font-normal text-[#4d544d]">
                    (optional for urgent LPOs)
                  </span>
                ) : null}
              </label>
              <InfoTip label="What does Prefill do?">
                Reads the PDF in your browser and fills in the number, client, addresses,
                terms and line items it can find. Nothing is saved until you press Create
                LPO. Check every field it fills.
              </InfoTip>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="lpo-file"
                ref={fileInputRef}
                type="file"
                name="file"
                accept="application/pdf,.pdf"
                required={!isUrgent}
                className="file-btn"
              />
              <button
                type="button"
                onClick={handlePrefillFromPdf}
                disabled={isExtracting}
                className="btn-secondary shrink-0"
              >
                {isExtracting ? "Reading PDF…" : "Prefill from this PDF"}
              </button>
            </div>
            <p className="text-[13px] leading-snug text-[#4d544d]">
              PDF only, up to 25MB.
            </p>
            {extractState.message ? (
              <p
                className={`rounded-[10px] px-3 py-2.5 text-[13px] leading-snug ${
                  extractState.ok
                    ? "bg-[var(--brand-muted)] text-[#2a4d33]"
                    : "bg-[#fdf0d5] text-[#6e4300]"
                }`}
                role="status"
              >
                {extractState.message}
              </p>
            ) : null}
          </div>
        </FormSection>

        <FormSection
          step={2}
          title="The client"
          help="Feeds the quotation, invoice and delivery note made for this LPO."
        >
          <ClientDetailsFields values={fields} onChange={updateField} />
        </FormSection>

        <LineItemsSection rows={lineItems} onChange={setLineItems} />
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-6">
        <DatesPanel receivedDate={fields.receivedDate} urgent={isUrgent} />

        <section
          className="surface-card flex flex-col gap-3.5 p-5"
          aria-labelledby="lpo-save-heading"
        >
          <h2 id="lpo-save-heading" className="text-[17px] font-bold">
            Ready to save?
          </h2>
          <p className="text-[13px] leading-snug text-[#4d544d]">
            {isUrgent
              ? "Saved as an urgent LPO, Under review. Assign a manufacturer, then mark delivery completed. No deadlines or reminders."
              : "The LPO is saved as Under review. Next you will assign a manufacturer and add the fabric it needs."}
          </p>

          {uploadError ? (
            <p className="text-sm text-red-700" role="status">
              {uploadError}
            </p>
          ) : null}
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
            disabled={isPending || isUploadingFile}
            className="btn-primary min-h-11 w-full"
          >
            {isUploadingFile
              ? "Uploading…"
              : isPending
                ? "Creating…"
                : isUrgent
                  ? "Create urgent LPO"
                  : "Create LPO"}
          </button>
        </section>
      </aside>
    </form>
  );
}
