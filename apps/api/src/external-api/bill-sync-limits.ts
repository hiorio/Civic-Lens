export const DEFAULT_BILL_SYNC_LIMIT = 500;
export const MAX_BILL_SYNC_LIMIT = 1000;

export function normalizeBillSyncLimit(value: number | string | undefined) {
  const parsedLimit =
    typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : typeof value === "number"
        ? value
        : DEFAULT_BILL_SYNC_LIMIT;

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_BILL_SYNC_LIMIT;
  }

  return Math.min(Math.floor(parsedLimit), MAX_BILL_SYNC_LIMIT);
}
