import { prisma } from "@/lib/db";

/** Removes an accessory or manufacturing invoice and its lines. Its PDF stays in storage. */
export async function deleteSupplierInvoice(input: {
  invoiceId: string;
  actorUserId: string;
}) {
  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id: input.invoiceId },
    select: { id: true, kind: true, supplierName: true, invoiceRef: true, total: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierInvoice.delete({ where: { id: invoice.id } });
    await tx.auditLog.create({
      data: {
        entityType: "SupplierInvoice",
        entityId: invoice.id,
        action: "SUPPLIER_INVOICE_DELETED",
        actorId: input.actorUserId,
        payload: {
          kind: invoice.kind,
          supplierName: invoice.supplierName,
          invoiceRef: invoice.invoiceRef,
          total: Number(invoice.total),
        },
      },
    });
  });
}
