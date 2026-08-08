import { prisma } from "@/lib/db";
import { storePdfUpload } from "@/modules/files/application/store-pdf";
import {
  calculateMetersRemaining,
  normalizeVendorName,
} from "@/modules/fabric/domain/meters";
import { createFabricEntrySchema } from "@/modules/fabric/schemas/create-fabric-entry";

export type CreateFabricEntryInput = {
  vendor: string;
  color: string;
  metersReceived: number;
  metersDelivered: number;
  destination: string;
  invoiceFile: File;
  createdByUserId: string;
};

export async function createFabricEntry(input: CreateFabricEntryInput) {
  const values = createFabricEntrySchema.parse({
    vendor: input.vendor,
    color: input.color,
    metersReceived: input.metersReceived,
    metersDelivered: input.metersDelivered,
    destination: input.destination,
  });

  calculateMetersRemaining(values.metersReceived, values.metersDelivered);

  const stored = await storePdfUpload(input.invoiceFile, "fabric-invoices");
  const vendorNormalized = normalizeVendorName(values.vendor);

  return prisma.$transaction(async (tx) => {
    const created = await tx.fabricEntry.create({
      data: {
        vendor: values.vendor.trim().replace(/\s+/g, " "),
        vendorNormalized,
        color: values.color,
        metersReceived: values.metersReceived,
        metersDelivered: values.metersDelivered,
        destination: values.destination,
        invoiceFileKey: stored.fileKey,
        invoiceFileName: stored.fileName,
        invoiceMimeType: stored.mimeType,
        createdById: input.createdByUserId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "FabricEntry",
        entityId: created.id,
        action: "FABRIC_ENTRY_CREATED",
        actorId: input.createdByUserId,
        payload: {
          vendor: created.vendor,
          metersReceived: values.metersReceived,
          metersDelivered: values.metersDelivered,
        },
      },
    });

    return created;
  });
}

export async function listFabricEntries(take = 100) {
  return prisma.fabricEntry.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function listFabricInvoicesByVendor() {
  const entries = await prisma.fabricEntry.findMany({
    orderBy: [{ vendorNormalized: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      vendor: true,
      vendorNormalized: true,
      color: true,
      invoiceFileKey: true,
      invoiceFileName: true,
      createdAt: true,
    },
  });

  const groups = new Map<
    string,
    {
      vendorNormalized: string;
      vendorLabel: string;
      invoices: typeof entries;
    }
  >();

  for (const entry of entries) {
    const existing = groups.get(entry.vendorNormalized);
    if (existing) {
      existing.invoices.push(entry);
    } else {
      groups.set(entry.vendorNormalized, {
        vendorNormalized: entry.vendorNormalized,
        vendorLabel: entry.vendor,
        invoices: [entry],
      });
    }
  }

  return [...groups.values()];
}
