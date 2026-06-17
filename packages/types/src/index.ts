export const followTargetKinds = [
  "MEMBER",
  "BILL",
  "DISTRICT",
  "KEYWORD",
  "COMMITTEE"
] as const;

export type FollowTargetKind = (typeof followTargetKinds)[number];

export const activityEventTypes = [
  "BILL_REGISTERED",
  "BILL_PRIMARY_SPONSORED",
  "BILL_CO_SPONSORED",
  "BILL_STATUS_CHANGED",
  "BILL_REFERRED_TO_COMMITTEE",
  "BILL_PASSED_PLENARY",
  "BILL_DISCARDED_OR_WITHDRAWN",
  "MEETING_REMARK_ADDED"
] as const;

export type ActivityEventType = (typeof activityEventTypes)[number];

export const activitySources = [
  "NATIONAL_ASSEMBLY_API",
  "MANUAL",
  "SYSTEM"
] as const;

export type ActivitySource = (typeof activitySources)[number];

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  source: ActivitySource;
  occurredAt: string;
  title: string;
  summary?: string | null;
  url?: string | null;
  targetKind: FollowTargetKind;
  targetId: string;
  dedupeKey: string;
}

export const billStatuses = [
  "UNKNOWN",
  "RECEIVED",
  "REFERRED_TO_COMMITTEE",
  "UNDER_COMMITTEE_REVIEW",
  "PASSED_COMMITTEE",
  "PASSED_PLENARY",
  "PROMULGATED",
  "DISCARDED",
  "WITHDRAWN"
] as const;

export type BillStatus = (typeof billStatuses)[number];

export interface FollowTarget {
  kind: FollowTargetKind;
  id: string;
  label?: string;
}

export interface NationalAssemblyBillRow {
  billNo: string;
  billName: string;
  proposer?: string | null;
  proposeDate?: string | null;
  committee?: string | null;
  status?: string | null;
  detailUrl?: string | null;
  raw: Record<string, unknown>;
}

export interface NationalAssemblyCoactorRow {
  name: string;
  partyName?: string | null;
  profileUrl?: string | null;
  raw: Record<string, unknown>;
}

export interface NationalAssemblyMemberRow {
  memberCode: string;
  name: string;
  partyName?: string | null;
  districtName?: string | null;
  committeeName?: string | null;
  electionUnits?: string | null;
  profileUrl?: string | null;
  photoUrl?: string | null;
  raw: Record<string, unknown>;
}

export interface NationalAssemblyBillClient {
  fetchRecentBills(limit?: number): Promise<NationalAssemblyBillRow[]>;
  fetchBillDetail(billNo: string): Promise<unknown>;
  fetchBillDetailRow(billNo: string): Promise<NationalAssemblyBillRow | null>;
  fetchBillCoactors(memberListUrl: string): Promise<NationalAssemblyCoactorRow[]>;
  fetchAssemblyMembers(): Promise<NationalAssemblyMemberRow[]>;
  normalizeBill(raw: unknown): NationalAssemblyBillRow;
}
