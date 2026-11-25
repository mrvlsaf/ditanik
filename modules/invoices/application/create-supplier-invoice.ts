import { SupplierInvoiceKind } from "@prisma/client";

import { DB_TRANSACTION_OPTIONS, prisma } from "@/lib/db";
import {
  storePdfUpload,
  type UploadedFileRef,
} from "@/modules/files/application/store-pdf";
import { calculateSupplierInvoice } from "@/modules/invoices/domain/supplier-invoice-lines";
import {
  supplierInvoiceSchema,
  type SupplierInvoiceValues,
} from "@/modules/invoices/schemas/supplier-invoice";
import {
  isReceivedDateAllowed,
  parseCalendarDateInput,
} from "@/modules/lpo/domain/due-dates";

export type CreateSupplierInvoiceInput = {
  type: SupplierInvoiceValues["type"];
  supplierName: string;
  invoiceRef?: string;
  receivedDate: string;
  lines: ReadonlyArray<SupplierInvoiceValues["lines"][number]>;
  /** The supplier's PDF. Required: it is the VAT record. */
  file: File | UploadedFileRef | null;
  createdByUserId: string;
};

const KIND_BY_TYPE: Record<SupplierInvoiceValues["type"], SupplierInvoiceKind> = {
  accessory: SupplierInvoiceKind.ACCESSORY,
  manufacturing: SupplierInvoiceKind.MANUFACTURING,
};

/** Records an accessory or manufacturing invoice with its PDF and lines. */
export async function createSupplierInvoice(input: CreateSupplierInvoiceInput) {
  const values = supplierInvoiceSchema.parse({
    type: input.type,
    supplierName: input.supplierName,
    invoiceRef: input.invoiceRef,
    receivedDate: input.receivedDate,
    lines: input.lines,
  });

  const receivedDate = parseCalendarDateInput(values.receivedDate);
  if (!isReceivedDateAllowed(receivedDate)) {
    throw new Error("Date received cannot be in the future.");
  }
  if (!input.file) {
    throw new Error("The invoice PDF is required.");
  }

  // Work the amounts out first, so a bad line fails before the file is stored.
  const { lines, totals } = calculateSupplierInvoice(values.lines);
  const stored = await storePdfUpload(input.file, "supplier-invoices");

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.supplierInvoice.create({
      data: {
        kind: KIND_BY_TYPE[values.type],
        supplierName: values.supplierName,
        invoiceRef: values.invoiceRef?.trim() || null,
        receivedDate,
        fileKey: stored.fileKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        createdById: input.createdByUserId,
        lines: {
          create: values.lines.map((line, index) => ({
            position: index + 1,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatPercent: line.vatPercent,
            lineTotal: lines[index]!.lineTotal,
            vatAmount: lines[index]!.vatAmount,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "SupplierInvoice",
        entityId: invoice.id,
        action: "SUPPLIER_INVOICE_CREATED",
        actorId: input.createdByUserId,
        payload: {
          type: values.type,
          supplierName: invoice.supplierName,
          invoiceRef: invoice.invoiceRef,
          receivedDate: values.receivedDate,
          lineCount: values.lines.length,
          subtotal: totals.subtotal,
          vatAmount: totals.vatAmount,
          total: totals.total,
        },
      },
    });

    return invoice;
  }, DB_TRANSACTION_OPTIONS);
}
