/** The first value of a query parameter that may be repeated. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The first value of a query parameter, trimmed, or "" when missing. */
export function trimmedParam(value: string | string[] | undefined): string {
  return firstParam(value)?.trim() ?? "";
}
