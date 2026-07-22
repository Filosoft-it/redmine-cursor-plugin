export function jsonResult(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/** Flatten custom field filters like cf_1, cf_4 into query params. */
export function applyCustomFieldFilters(
  query: Record<string, string | number | boolean | undefined | null>,
  customFields?: Record<string, string | number>,
): void {
  if (!customFields) return;
  for (const [key, value] of Object.entries(customFields)) {
    const fieldKey = key.startsWith("cf_") ? key : `cf_${key}`;
    query[fieldKey] = value;
  }
}
