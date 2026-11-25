"use client";

import { useState } from "react";

import {
  DIRECT_UPLOAD_THRESHOLD_BYTES,
  uploadPdfDirectToBlob,
} from "@/lib/direct-blob-upload";

/**
 * Wraps a `useActionState` form's `onSubmit`: a PDF over the threshold (and only
 * when `usesBlobStorage`) is uploaded directly to Blob and the action gets a small
 * file reference. Anything else is left to the normal `action={formAction}`
 * (see DIRECT_UPLOAD_THRESHOLD_BYTES).
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
      // Small file, no file, or no Blob storage: normal submission.
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
