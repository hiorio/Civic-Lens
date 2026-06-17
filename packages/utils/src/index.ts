import type {
  ActivityEventType,
  ActivitySource,
  FollowTargetKind
} from "@civic-lens/types";

export function normalizeKeyword(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function createExternalId(source: ActivitySource, id: string): string {
  return `${source}:${id.trim()}`;
}

export function createActivityEventDedupeKey(input: {
  source: ActivitySource;
  type: ActivityEventType;
  targetKind: FollowTargetKind;
  targetId: string;
  occurredAt: Date | string;
  subjectId?: string;
}): string {
  const occurredAt =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString()
      : new Date(input.occurredAt).toISOString();

  return [
    input.source,
    input.type,
    input.targetKind,
    input.targetId.trim(),
    input.subjectId?.trim(),
    occurredAt.slice(0, 10)
  ]
    .filter((part): part is string => Boolean(part))
    .join(":");
}

export function formatActivityTitle(input: {
  type: ActivityEventType;
  title: string;
}): string {
  switch (input.type) {
    case "BILL_REGISTERED":
      return `새 의안: ${input.title}`;
    case "BILL_PRIMARY_SPONSORED":
      return `대표발의: ${input.title}`;
    case "BILL_CO_SPONSORED":
      return `공동발의: ${input.title}`;
    case "BILL_STATUS_CHANGED":
      return `처리상태 변경: ${input.title}`;
    case "BILL_REFERRED_TO_COMMITTEE":
      return `위원회 회부: ${input.title}`;
    case "BILL_PASSED_PLENARY":
      return `본회의 통과: ${input.title}`;
    case "BILL_DISCARDED_OR_WITHDRAWN":
      return `폐기 또는 철회: ${input.title}`;
    case "MEETING_REMARK_ADDED":
      return `회의록 발언 추가: ${input.title}`;
  }

  const exhaustive: never = input.type;
  return exhaustive;
}

export function normalizeAssemblyMemberName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/의원/g, "")
    .replace(/\s*등\s*\d+\s*인/g, "")
    .trim();
}

export function extractPrimarySponsorName(input: {
  primaryName?: string | null;
  proposerText?: string | null;
}): string | null {
  const rawName = input.primaryName ?? input.proposerText;

  if (!rawName) {
    return null;
  }

  const normalized = normalizeAssemblyMemberName(rawName);

  return normalized.length > 0 ? normalized : null;
}
