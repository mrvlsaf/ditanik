import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Prisma } from "@prisma/client";

import { BUSINESS_TIMEZONE } from "@/lib/dates/timezone";
import { prisma } from "@/lib/db";

export type ListFabricInvoicesFilters = {
  supplier?: string;
  /** YYYY-MM in Asia/Dubai */
  month?: string;
  q?: string;
};

function dubaiMonthKey(date: Date): string {
  return format(toZonedTime(date, BUSINESS_TIMEZONE), "yyyy-MM");
}

export async function listFabricInvoiceSuppliers(): Promise<string[]> {
  const rows = await prisma.fabricSupplierInvoice.findMany({
    select: { supplierName: true },
    distinct: ["supplierName"],
    orderBy: { supplierName: "asc" },
  });
  return rows.map((row) => row.supplierName);
}

export async function listFabricInvoiceMonths(): Promise<string[]> {
  const rows = await prisma.fabricSupplierInvoice.findMany({
    select: { receivedDate: true },
    orderBy: { receivedDate: "desc" },
  });
  const months = new Set<string>();
  for (const row of rows) {
    months.add(dubaiMonthKey(row.receivedDate));
  }
  return [...months].sort((a, b) => b.localeCompare(a));
}

export async function listFabricInvoices(filters: ListFabricInvoicesFilters = {}) {
  const supplier = filters.supplier?.trim();
  const month = filters.month?.trim();
  const q = filters.q?.trim();

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month must be YYYY-MM.");
  }

  const where: Prisma.FabricSupplierInvoiceWhereInput = {};

  if (supplier) {
    where.supplierName = supplier;
  }

  if (q) {
    where.invoiceRef = { contains: q, mode: "insensitive" };
  }

  // Month filter applied in memory on Dubai calendar month (receivedDate is @db.Date).
  const invoices = await prisma.fabricSupplierInvoice.findMany({
    where,
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
    include: {
      batches: {
        select: {
          id: true,
          fabricCode: true,
          fabricType: true,
          colour: true,
          qtyReceived: true,
        },
      },
    },
  });

  const filtered = month
    ? invoices.filter((invoice) => dubaiMonthKey(invoice.receivedDate) === month)
    : invoices;

  return filtered.map((invoice) => ({
    id: invoice.id,
    supplierName: invoice.supplierName,
    invoiceRef: invoice.invoiceRef,
    receivedDate: invoice.receivedDate,
    month: dubaiMonthKey(invoice.receivedDate),
    invoiceFileKey: invoice.invoiceFileKey,
    invoiceFileName: invoice.invoiceFileName,
    batchCount: invoice.batches.length,
    batches: invoice.batches.map((batch) => ({
      ...batch,
      qtyReceived: Number(batch.qtyReceived),
    })),
    createdAt: invoice.createdAt,
  }));
}
