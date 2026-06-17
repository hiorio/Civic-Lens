"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { HealthCheck } from "./health-check";

type LoadState = "idle" | "loading" | "ready" | "error";
type ViewMode = "bills" | "members";
type BillMemberRole = "PRIMARY_SPONSOR" | "CO_SPONSOR";
type DetailSelection =
  | { kind: "bills"; id: string; label: string }
  | { kind: "members"; id: string; label: string };
type DetailState =
  | { status: "idle"; selection: null; data: null; error: null }
  | { status: "loading"; selection: DetailSelection; data: null; error: null }
  | {
      status: "ready";
      selection: DetailSelection;
      data: BillDetail | MemberDetail;
      error: null;
    }
  | { status: "error"; selection: DetailSelection; data: null; error: string };

interface BillListItem {
  id: string;
  billNo: string;
  title: string;
  status: string;
  proposedAt: string | null;
  committeeName: string | null;
  detailUrl: string | null;
  billMembers: Array<{
    role: BillMemberRole;
    member: MemberSummary;
  }>;
}

interface BillDetail extends BillListItem {
  externalId: string;
  createdAt: string;
  updatedAt: string;
  billMembers: Array<{
    id: string;
    role: BillMemberRole;
    member: MemberSummary & {
      profileUrl: string | null;
    };
  }>;
  statusHistories: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    rawStatus: string | null;
    description: string | null;
    changedAt: string;
  }>;
  activityEvents: Array<ActivityEventItem & { member?: MemberSummary | null }>;
}

interface MemberSummary {
  id: string;
  externalId: string;
  name: string;
  partyName: string | null;
  districtName: string | null;
  photoUrl: string | null;
}

interface MemberListItem extends MemberSummary {
  profileUrl: string | null;
  billMembers: Array<{
    role: BillMemberRole;
    bill: {
      billNo: string;
      title: string;
      proposedAt: string | null;
      status: string;
    };
  }>;
}

interface MemberDetail extends MemberSummary {
  profileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  billMembers: Array<{
    id: string;
    role: BillMemberRole;
    createdAt: string;
    bill: {
      id: string;
      externalId: string;
      billNo: string;
      title: string;
      status: string;
      proposedAt: string | null;
      committeeName: string | null;
      detailUrl: string | null;
    };
  }>;
  activityEvents: Array<ActivityEventItem & {
    bill?: {
      id: string;
      billNo: string;
      title: string;
      status: string;
    } | null;
  }>;
}

interface ActivityEventItem {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  url: string | null;
  targetKind: string;
  targetId: string;
  occurredAt: string;
  collectedAt: string;
}

interface SyncLog {
  id: string;
  jobName: string;
  status: string;
  finishedAt: string | null;
  fetchedCount: number;
  storedCount: number;
  metadata: Record<string, unknown> | null;
}

interface DashboardData {
  bills: BillListItem[];
  members: MemberListItem[];
  syncLogs: SyncLog[];
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";

export function CivicDashboard() {
  const [data, setData] = useState<DashboardData>({
    bills: [],
    members: [],
    syncLogs: []
  });
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [detailState, setDetailState] = useState<DetailState>({
    status: "idle",
    selection: null,
    data: null,
    error: null
  });
  const [selection, setSelection] = useState<DetailSelection | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("bills");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoadState("loading");

      try {
        const [bills, members, syncLogs] = await Promise.all([
          fetchJson<BillListItem[]>(`${apiBaseUrl}/bills`),
          fetchJson<MemberListItem[]>(`${apiBaseUrl}/members`),
          fetchJson<SyncLog[]>(`${apiBaseUrl}/sync-logs`)
        ]);

        if (!isMounted) {
          return;
        }

        setData({ bills, members, syncLogs });
        setSelection(
          bills[0]
            ? { kind: "bills", id: bills[0].id, label: bills[0].billNo }
            : null
        );
        setLoadState("ready");
      } catch {
        if (isMounted) {
          setLoadState("error");
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      if (!selection) {
        setDetailState({ status: "idle", selection: null, data: null, error: null });
        return;
      }

      setDetailState({ status: "loading", selection, data: null, error: null });

      try {
        const detail = await fetchJson<BillDetail | MemberDetail>(
          `${apiBaseUrl}/${selection.kind}/${encodeURIComponent(selection.id)}`
        );

        if (isMounted) {
          setDetailState({ status: "ready", selection, data: detail, error: null });
        }
      } catch {
        if (isMounted) {
          setDetailState({
            status: "error",
            selection,
            data: null,
            error: "상세 데이터를 불러오지 못했습니다."
          });
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selection]);

  const latestBillSync = data.syncLogs.find((log) => log.jobName === "sync:bills");
  const latestMemberSync = data.syncLogs.find(
    (log) => log.jobName === "sync:members"
  );
  const filteredBills = useMemo(
    () =>
      data.bills.filter((bill) =>
        [bill.title, bill.billNo, bill.committeeName ?? ""]
          .join(" ")
          .toLocaleLowerCase("ko-KR")
          .includes(query.toLocaleLowerCase("ko-KR"))
      ),
    [data.bills, query]
  );
  const filteredMembers = useMemo(
    () =>
      data.members.filter((member) =>
        [member.name, member.partyName ?? "", member.districtName ?? ""]
          .join(" ")
          .toLocaleLowerCase("ko-KR")
          .includes(query.toLocaleLowerCase("ko-KR"))
      ),
    [data.members, query]
  );

  return (
    <main className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Civic Lens</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              시민의 시선으로 국회의 움직임을 추적합니다.
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm sm:min-w-96">
            <Metric label="의안" value={data.bills.length} tone="emerald" />
            <Metric label="의원" value={data.members.length} tone="indigo" />
            <Metric
              label="활동"
              value={latestBillSync?.metadata?.eventCount ?? "-"}
              tone="amber"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex w-fit rounded-md border border-slate-300 bg-white p-1">
              <button
                className={tabClass(viewMode === "bills")}
                onClick={() => {
                  setViewMode("bills");
                  const firstBill = filteredBills[0] ?? data.bills[0];
                  setSelection(
                    firstBill
                      ? { kind: "bills", id: firstBill.id, label: firstBill.billNo }
                      : null
                  );
                }}
                type="button"
              >
                의안
              </button>
              <button
                className={tabClass(viewMode === "members")}
                onClick={() => {
                  setViewMode("members");
                  const firstMember = filteredMembers[0] ?? data.members[0];
                  setSelection(
                    firstMember
                      ? {
                          kind: "members",
                          id: firstMember.id,
                          label: firstMember.name
                        }
                      : null
                  );
                }}
                type="button"
              >
                의원
              </button>
            </div>
            <input
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-700 sm:w-80"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={viewMode === "bills" ? "의안 검색" : "의원 검색"}
              value={query}
            />
          </div>

          {loadState === "loading" ? (
            <PanelMessage text="데이터를 불러오는 중입니다." />
          ) : null}
          {loadState === "error" ? (
            <PanelMessage text="API 서버에 연결할 수 없습니다." />
          ) : null}

          {loadState === "ready" && viewMode === "bills" ? (
            <BillList
              bills={filteredBills}
              onSelect={(bill) =>
                setSelection({ kind: "bills", id: bill.id, label: bill.billNo })
              }
              selectedId={selection?.kind === "bills" ? selection.id : null}
            />
          ) : null}
          {loadState === "ready" && viewMode === "members" ? (
            <MemberList
              members={filteredMembers}
              onSelect={(member) =>
                setSelection({
                  kind: "members",
                  id: member.id,
                  label: member.name
                })
              }
              selectedId={selection?.kind === "members" ? selection.id : null}
            />
          ) : null}
        </section>

        <aside className="space-y-4">
          <HealthCheck />
          <DetailPanel
            detailState={detailState}
            onSelectBill={(bill) => {
              setViewMode("bills");
              setSelection({ kind: "bills", id: bill.id, label: bill.billNo });
            }}
            onSelectMember={(member) => {
              setViewMode("members");
              setSelection({ kind: "members", id: member.id, label: member.name });
            }}
            selection={selection}
          />
          <SyncPanel title="의안 수집" syncLog={latestBillSync} />
          <SyncPanel title="의원 동기화" syncLog={latestMemberSync} />
        </aside>
      </div>
    </main>
  );
}

function BillList({
  bills,
  onSelect,
  selectedId
}: {
  bills: BillListItem[];
  onSelect: (bill: BillListItem) => void;
  selectedId: string | null;
}) {
  if (bills.length === 0) {
    return <PanelMessage text="표시할 의안이 없습니다." />;
  }

  return (
    <div className="mt-4 space-y-3">
      {bills.map((bill) => {
        const primarySponsor = bill.billMembers.find(
          (item) => item.role === "PRIMARY_SPONSOR"
        )?.member;
        const coSponsorCount = bill.billMembers.filter(
          (item) => item.role === "CO_SPONSOR"
        ).length;

        return (
          <article
            className={itemCardClass(selectedId === bill.id)}
            key={bill.id}
          >
            <button
              className="block w-full text-left"
              onClick={() => onSelect(bill)}
              type="button"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{bill.billNo}</span>
                    <StatusBadge status={bill.status} />
                    <span>{formatDate(bill.proposedAt)}</span>
                    {bill.committeeName ? <span>{bill.committeeName}</span> : null}
                  </div>
                  <h2 className="mt-2 text-base font-semibold leading-6 text-slate-950">
                    {bill.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    대표발의 {primarySponsor?.name ?? "확인 중"} · 공동발의{" "}
                    {coSponsorCount}명
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700">
                  상세
                </span>
              </div>
            </button>
          </article>
        );
      })}
    </div>
  );
}

function MemberList({
  members,
  onSelect,
  selectedId
}: {
  members: MemberListItem[];
  onSelect: (member: MemberListItem) => void;
  selectedId: string | null;
}) {
  if (members.length === 0) {
    return <PanelMessage text="표시할 의원이 없습니다." />;
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {members.map((member) => (
        <article
          className={itemCardClass(selectedId === member.id)}
          key={member.id}
        >
          <button
            className="block w-full text-left"
            onClick={() => onSelect(member)}
            type="button"
          >
            <div className="flex gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-200">
                {member.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={member.photoUrl}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-950">{member.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {member.partyName ?? "정당 미확인"} ·{" "}
                  {member.districtName ?? "지역구 미확인"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  최근 관련 의안 {member.billMembers.length}건
                </p>
              </div>
            </div>
          </button>
        </article>
      ))}
    </div>
  );
}

function DetailPanel({
  detailState,
  onSelectBill,
  onSelectMember,
  selection
}: {
  detailState: DetailState;
  onSelectBill: (bill: { id: string; billNo: string }) => void;
  onSelectMember: (member: { id: string; name: string }) => void;
  selection: DetailSelection | null;
}) {
  if (!selection) {
    return (
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">상세 정보</h2>
        <p className="mt-3 text-sm text-slate-600">선택된 항목이 없습니다.</p>
      </section>
    );
  }

  if (!isDetailStateForSelection(detailState, selection)) {
    return <SidePanelMessage title="상세 정보" text="상세 데이터를 불러오는 중입니다." />;
  }

  if (detailState.status === "loading") {
    return <SidePanelMessage title="상세 정보" text="상세 데이터를 불러오는 중입니다." />;
  }

  if (detailState.status === "error") {
    return (
      <SidePanelMessage
        title="상세 정보"
        text={detailState.error ?? "상세 데이터를 불러오지 못했습니다."}
      />
    );
  }

  if (detailState.status !== "ready") {
    return <SidePanelMessage title="상세 정보" text="상세 데이터를 기다리는 중입니다." />;
  }

  return selection.kind === "bills" ? (
    <BillDetailPanel
      bill={detailState.data as BillDetail}
      onSelectMember={onSelectMember}
    />
  ) : (
    <MemberDetailPanel
      member={detailState.data as MemberDetail}
      onSelectBill={onSelectBill}
    />
  );
}

function isDetailStateForSelection(
  detailState: DetailState,
  selection: DetailSelection
) {
  if (detailState.status === "idle") {
    return false;
  }

  return (
    detailState.selection.kind === selection.kind &&
    detailState.selection.id === selection.id
  );
}

function BillDetailPanel({
  bill,
  onSelectMember
}: {
  bill: BillDetail;
  onSelectMember: (member: { id: string; name: string }) => void;
}) {
  const primarySponsor = bill.billMembers.find(
    (item) => item.role === "PRIMARY_SPONSOR"
  )?.member;
  const coSponsors = bill.billMembers.filter((item) => item.role === "CO_SPONSOR");

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-emerald-700">{bill.billNo}</p>
          <h2 className="mt-2 text-base font-semibold leading-6 text-slate-950">
            {bill.title}
          </h2>
        </div>
        <StatusBadge status={bill.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="제안일" value={formatDate(bill.proposedAt)} />
        <Field label="소관위" value={bill.committeeName ?? "미확인"} />
        <Field label="대표발의" value={primarySponsor?.name ?? "확인 중"} />
        <Field label="공동발의" value={`${coSponsors.length}명`} />
      </dl>

      {bill.detailUrl ? (
        <a
          className="mt-4 block rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800"
          href={bill.detailUrl}
          rel="noreferrer"
          target="_blank"
        >
          국회 원문 보기
        </a>
      ) : null}

      <DetailSection title="발의 의원">
        {bill.billMembers.length > 0 ? (
          <ul className="grid gap-2">
            {bill.billMembers.map((item) => (
              <li key={item.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 rounded border border-slate-200 p-3 text-left transition hover:border-emerald-700 hover:bg-emerald-50"
                  onClick={() => onSelectMember(item.member)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-950">
                      {item.member.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.member.partyName ?? "정당 미확인"} ·{" "}
                      {item.member.districtName ?? "지역구 미확인"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-emerald-700">
                    {roleLabel(item.role)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">발의 의원 정보가 없습니다.</p>
        )}
      </DetailSection>

      <DetailSection title="처리 상태 이력">
        {bill.statusHistories.length > 0 ? (
          <ol className="space-y-3">
            {bill.statusHistories.map((history) => (
              <li className="border-l-2 border-slate-200 pl-3" key={history.id}>
                <p className="text-sm font-medium text-slate-950">
                  {statusLabel(history.toStatus)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(history.changedAt)}
                  {history.rawStatus ? ` · ${history.rawStatus}` : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-600">처리 상태 이력이 없습니다.</p>
        )}
      </DetailSection>

      <DetailSection title="최근 활동">
        <ActivityList events={bill.activityEvents} />
      </DetailSection>
    </section>
  );
}

function MemberDetailPanel({
  member,
  onSelectBill
}: {
  member: MemberDetail;
  onSelectBill: (bill: { id: string; billNo: string }) => void;
}) {
  const primaryBills = member.billMembers.filter(
    (item) => item.role === "PRIMARY_SPONSOR"
  );
  const coSponsoredBills = member.billMembers.filter(
    (item) => item.role === "CO_SPONSOR"
  );

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-200">
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={member.photoUrl} />
          ) : null}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">{member.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {member.partyName ?? "정당 미확인"} ·{" "}
            {member.districtName ?? "지역구 미확인"}
          </p>
          {member.profileUrl ? (
            <a
              className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-900"
              href={member.profileUrl}
              rel="noreferrer"
              target="_blank"
            >
              공식 프로필
            </a>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="대표발의" value={`${primaryBills.length}건`} />
        <Field label="공동발의" value={`${coSponsoredBills.length}건`} />
      </dl>

      <DetailSection title="최근 관련 의안">
        {member.billMembers.length > 0 ? (
          <ul className="space-y-3">
            {member.billMembers.slice(0, 12).map((item) => (
              <li className="rounded border border-slate-200 p-3" key={item.id}>
                <button
                  className="block w-full text-left"
                  onClick={() => onSelectBill(item.bill)}
                  type="button"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{roleLabel(item.role)}</span>
                    <StatusBadge status={item.bill.status} />
                  </div>
                  <p className="mt-2 text-sm font-medium leading-5 text-slate-950">
                    {item.bill.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.bill.billNo} · {formatDate(item.bill.proposedAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">관련 의안이 없습니다.</p>
        )}
      </DetailSection>

      <DetailSection title="최근 활동">
        <ActivityList events={member.activityEvents} />
      </DetailSection>
    </section>
  );
}

function ActivityList({ events }: { events: ActivityEventItem[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-600">활동 이벤트가 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {events.slice(0, 10).map((event) => (
        <li className="border-l-2 border-slate-200 pl-3" key={event.id}>
          <p className="text-sm font-medium text-slate-950">{event.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {eventTypeLabel(event.type)} · {formatDate(event.occurredAt)}
          </p>
          {event.summary ? (
            <p className="mt-1 text-sm leading-5 text-slate-600">{event.summary}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SyncPanel({
  syncLog,
  title
}: {
  syncLog?: SyncLog;
  title: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <span className="text-xs font-medium text-slate-500">
          {syncLog?.status ?? "-"}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Field label="수집" value={syncLog?.fetchedCount ?? "-"} />
        <Field label="저장" value={syncLog?.storedCount ?? "-"} />
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        {formatDateTime(syncLog?.finishedAt)}
      </p>
    </section>
  );
}

function DetailSection({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  tone,
  value
}: {
  label: string;
  tone: "amber" | "emerald" | "indigo";
  value: number | string | unknown;
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900"
  }[tone];

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="mt-1 text-xl font-semibold">{String(value)}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600">
      {statusLabel(status)}
    </span>
  );
}

function PanelMessage({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
      {text}
    </div>
  );
}

function SidePanelMessage({ text, title }: { text: string; title: string }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm text-slate-600">{text}</p>
    </section>
  );
}

function itemCardClass(isActive: boolean) {
  return [
    "rounded-md border bg-white p-4 shadow-sm transition",
    isActive
      ? "border-emerald-700 ring-1 ring-emerald-700"
      : "border-slate-200 hover:border-slate-300"
  ].join(" ");
}

function tabClass(isActive: boolean) {
  return [
    "h-9 min-w-20 rounded px-3 text-sm font-medium transition",
    isActive
      ? "bg-slate-950 text-white"
      : "bg-transparent text-slate-600 hover:bg-slate-100"
  ].join(" ");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "날짜 미확인";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "동기화 기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    BILL_CO_SPONSORED: "공동발의",
    BILL_DISCARDED_OR_WITHDRAWN: "폐기 또는 철회",
    BILL_PASSED_PLENARY: "본회의 통과",
    BILL_PRIMARY_SPONSORED: "대표발의",
    BILL_REFERRED_TO_COMMITTEE: "위원회 회부",
    BILL_REGISTERED: "의안 등록",
    BILL_STATUS_CHANGED: "처리상태 변경",
    MEETING_REMARK_ADDED: "회의록 발언"
  };

  return labels[type] ?? type;
}

function roleLabel(role: BillMemberRole) {
  return role === "PRIMARY_SPONSOR" ? "대표발의" : "공동발의";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DISCARDED: "폐기",
    PASSED_COMMITTEE: "위원회 통과",
    PASSED_PLENARY: "본회의 통과",
    PROMULGATED: "공포",
    RECEIVED: "접수",
    REFERRED_TO_COMMITTEE: "위원회 회부",
    UNDER_COMMITTEE_REVIEW: "위원회 심사",
    UNKNOWN: "확인 필요",
    WITHDRAWN: "철회"
  };

  return labels[status] ?? status;
}
