import Link from "next/link";
import { notFound } from "next/navigation";

type BillMemberRole = "PRIMARY_SPONSOR" | "CO_SPONSOR";

interface MemberDetail {
  id: string;
  externalId: string;
  name: string;
  partyName: string | null;
  districtName: string | null;
  profileUrl: string | null;
  photoUrl: string | null;
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
  activityEvents: Array<{
    id: string;
    type: string;
    title: string;
    summary: string | null;
    url: string | null;
    targetKind: string;
    targetId: string;
    occurredAt: string;
    collectedAt: string;
    bill: {
      id: string;
      billNo: string;
      title: string;
      status: string;
    } | null;
  }>;
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/v1";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMember(id);
  const primaryBills = member.billMembers.filter(
    (item) => item.role === "PRIMARY_SPONSOR"
  );
  const coSponsoredBills = member.billMembers.filter(
    (item) => item.role === "CO_SPONSOR"
  );

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-6">
          <Link
            className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
            href="/"
          >
            <span>Civic Lens</span>
            <span aria-hidden="true" className="text-base leading-none">
              👀
            </span>
          </Link>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-200">
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{member.partyName ?? "정당 미확인"}</span>
                  <span>{member.districtName ?? "지역구 미확인"}</span>
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 md:text-5xl">
                  {member.name}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                  수집된 국회 공개 데이터를 바탕으로 이 의원과 연결된 최근 의안
                  활동을 정리한 화면입니다. 현재 통계는 수집 범위에 따라 달라질
                  수 있습니다.
                </p>
              </div>
            </div>
            {member.profileUrl ? (
              <a
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href={member.profileUrl}
                rel="noreferrer"
                target="_blank"
              >
                국회 프로필 보기
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">의원 요약</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="이름" value={member.name} />
              <Field label="정당" value={member.partyName ?? "정당 미확인"} />
              <Field
                label="지역구"
                value={member.districtName ?? "지역구 미확인"}
              />
              <Field label="연결 의안" value={`${member.billMembers.length}건`} />
              <Field label="대표발의" value={`${primaryBills.length}건`} />
              <Field label="공동발의" value={`${coSponsoredBills.length}건`} />
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  최근 연결 의안
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  현재 수집된 의안 범위에서 이 의원과 연결된 항목입니다.
                </p>
              </div>
            </div>
            {member.billMembers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {member.billMembers.map((item) => (
                  <article
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={item.id}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{item.bill.billNo}</span>
                          <RoleBadge role={item.role} />
                          <StatusBadge status={item.bill.status} />
                          <span>{formatDate(item.bill.proposedAt)}</span>
                          {item.bill.committeeName ? (
                            <span>{item.bill.committeeName}</span>
                          ) : null}
                        </div>
                        <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-950">
                          <Link
                            className="text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                            href={`/bills/${encodeURIComponent(item.bill.id)}`}
                          >
                            {item.bill.title}
                          </Link>
                        </h3>
                      </div>
                      {item.bill.detailUrl ? (
                        <a
                          className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-emerald-700 hover:text-emerald-800"
                          href={item.bill.detailUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          원문
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                아직 연결된 의안 데이터가 없습니다.
              </p>
            )}
          </section>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">수집 정보</h2>
            <dl className="mt-4 space-y-3">
              <Field label="내부 ID" value={member.id} />
              <Field label="외부 ID" value={member.externalId} />
              <Field label="최초 저장" value={formatDateTime(member.createdAt)} />
              <Field label="최근 갱신" value={formatDateTime(member.updatedAt)} />
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">활동 이벤트</h2>
            {member.activityEvents.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {member.activityEvents.map((event) => (
                  <li
                    className="rounded-md border border-slate-200 bg-slate-50 p-3"
                    key={event.id}
                  >
                    <p className="text-xs font-medium text-emerald-700">
                      {eventTypeLabel(event.type)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">
                      {event.bill ? (
                        <Link
                          className="text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                          href={`/bills/${encodeURIComponent(event.bill.id)}`}
                        >
                          {event.title}
                        </Link>
                      ) : (
                        event.title
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(event.occurredAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                아직 연결된 활동 이벤트가 없습니다.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

async function getMember(id: string) {
  const response = await fetch(`${apiBaseUrl}/members/${encodeURIComponent(id)}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error(`Failed to load member: ${response.status}`);
  }

  return (await response.json()) as MemberDetail;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function RoleBadge({ role }: { role: BillMemberRole }) {
  const className =
    role === "PRIMARY_SPONSOR"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-indigo-200 bg-indigo-50 text-indigo-800";

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-semibold ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600">
      {statusLabel(status)}
    </span>
  );
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
    return "확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    BILL_CO_SPONSORED: "공동발의",
    BILL_DISCARDED_OR_WITHDRAWN: "폐기 또는 철회",
    BILL_PASSED_PLENARY: "본회의 통과",
    BILL_PRIMARY_SPONSORED: "대표발의",
    BILL_REFERRED_TO_COMMITTEE: "위원회 회부",
    BILL_REGISTERED: "새 의안 등록",
    BILL_STATUS_CHANGED: "처리상태 변경",
    MEETING_REMARK_ADDED: "회의록 발언"
  };

  return labels[type] ?? type;
}
