/** A text field from a form submission, or "" when it is missing or a file. */
export function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Like readFormString, but trimmed, and undefined when blank. */
export function readOptionalFormString(
  formData: FormData,
  key: string,
): string | undefined {
  return readFormString(formData, key).trim() || undefined;
}
