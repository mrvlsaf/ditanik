import { SupplierInvoiceKind } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  fabricInvoiceRow,
  sortInvoiceRows,
  supplierInvoiceRow,
  taxInvoiceRow,
  type InvoiceRow,
} from "@/modules/invoices/domain/invoice-hub";

/** Most recent rows read from each kind of invoice. The list is filtered in memory. */
const INVOICES_PER_KIND_LIMIT = 1000;

/** Every invoice of every kind as one list of rows, newest first. */
export async function listAllInvoices(): Promise<InvoiceRow[]> {
  const [taxDocuments, fabricInvoices, supplierInvoices] = await Promise.all([
    prisma.generatedDocument.findMany({
      where: { type: "TAX_INVOICE" },
      orderBy: { generatedAt: "desc" },
      take: INVOICES_PER_KIND_LIMIT,
      select: {
        id: true,
        documentNumber: true,
        generatedAt: true,
        clientName: true,
        snapshot: true,
        fileKey: true,
        fileName: true,
        lpo: { select: { id: true, lpoNumber: true, clientName: true } },
      },
    }),
    prisma.fabricSupplierInvoice.findMany({
      where: { isActive: true },
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
      take: INVOICES_PER_KIND_LIMIT,
      select: {
        id: true,
        supplierName: true,
        invoiceRef: true,
        receivedDate: true,
        totalInclVat: true,
        invoiceFileKey: true,
        invoiceFileName: true,
        _count: { select: { batches: true } },
      },
    }),
    prisma.supplierInvoice.findMany({
      orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
      take: INVOICES_PER_KIND_LIMIT,
      select: {
        id: true,
        kind: true,
        supplierName: true,
        invoiceRef: true,
        receivedDate: true,
        total: true,
        vatAmount: true,
        fileKey: true,
        fileName: true,
      },
    }),
  ]);

  const rows: InvoiceRow[] = [
    ...taxDocuments.map((doc) => taxInvoiceRow(doc)),
    ...fabricInvoices.map((invoice) =>
      fabricInvoiceRow({
        id: invoice.id,
        supplierName: invoice.supplierName,
        invoiceRef: invoice.invoiceRef,
        receivedDate: invoice.receivedDate,
        batchCount: invoice._count.batches,
        totalInclVat: invoice.totalInclVat === null ? null : Number(invoice.totalInclVat),
        fileKey: invoice.invoiceFileKey,
        fileName: invoice.invoiceFileName,
      }),
    ),
    ...supplierInvoices.map((invoice) =>
      supplierInvoiceRow({
        id: invoice.id,
        type:
          invoice.kind === SupplierInvoiceKind.ACCESSORY ? "accessory" : "manufacturing",
        supplierName: invoice.supplierName,
        invoiceRef: invoice.invoiceRef,
        receivedDate: invoice.receivedDate,
        total: Number(invoice.total),
        vatAmount: Number(invoice.vatAmount),
        fileKey: invoice.fileKey,
        fileName: invoice.fileName,
      }),
    ),
  ];

  return sortInvoiceRows(rows);
}
