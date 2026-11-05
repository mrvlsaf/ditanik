"use client";

import { useState } from "react";

import {
  DIRECT_UPLOAD_THRESHOLD_BYTES,
  uploadPdfDirectToBlob,
} from "@/lib/direct-blob-upload";

/**
 * Wraps a `useActionState` form's `onSubmit` so that a large PDF file input
 * is uploaded directly to Blob storage first, and the action receives a
 * small file reference instead of the raw bytes — see
 * DIRECT_UPLOAD_THRESHOLD_BYTES for why (Vercel's non-configurable 4.5MB
 * Serverless Function payload cap, which a Server Action call runs into
 * same as any other function).
 *
 * A small/typical file, or any file when Blob storage isn't the active
 * backend (local dev), is left completely alone: `onSubmit` does nothing
 * and the form's own `action={formAction}` submits it the normal way,
 * unchanged. Only a file over the threshold — and only when
 * `usesBlobStorage` is true — is intercepted.
 */
export function useDirectUploadOnSubmit({
  formAction,
  formRef,
  fileFieldName,
  fileRefFieldName,
  folder,
  usesBlobStorage,
}: {
  formAction: (formData: FormData) => void;
  formRef: React.RefObject<HTMLFormElement | null>;
  fileFieldName: string;
  fileRefFieldName: string;
  folder: string;
  usesBlobStorage: boolean;
}) {
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const fileValue = new FormData(form).get(fileFieldName);
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    if (!file || !usesBlobStorage || file.size <= DIRECT_UPLOAD_THRESHOLD_BYTES) {
      // Under the threshold (or nothing selected, or Blob storage isn't
      // active): let the normal action={formAction} submission proceed.
      return;
    }

    event.preventDefault();
    setUploadError(null);
    setIsUploadingFile(true);
    try {
      const ref = await uploadPdfDirectToBlob(file, folder);
      const formData = new FormData(form);
      formData.delete(fileFieldName);
      formData.set(fileRefFieldName, JSON.stringify(ref));
      formAction(formData);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Could not upload the file.",
      );
    } finally {
      setIsUploadingFile(false);
    }
  }

  return { onSubmit, isUploadingFile, uploadError };
}
